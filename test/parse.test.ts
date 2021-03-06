import {expect} from 'chai'
import chalk from 'chalk'

import {flags, parse} from '../src'

chalk.enabled = false

describe('parse', () => {
  it('--bool', () => {
    const out = parse(['--bool'], {
      flags: {
        bool: flags.boolean(),
      },
    })
    expect(out).to.deep.include({flags: {bool: true}})
  })

  it('arg1', () => {
    const out = parse(['arg1'], {
      args: [{name: 'foo'}],
    })
    expect(out.argv).to.deep.equal(['arg1'])
    expect(out.args).to.deep.equal({foo: 'arg1'})
  })

  it('arg1 arg2', () => {
    const out = parse(['arg1', 'arg2'], {
      args: [{name: 'foo'}, {name: 'bar'}],
    })
    expect(out.argv).to.deep.equal(['arg1', 'arg2'])
    expect(out.args).to.deep.equal({foo: 'arg1', bar: 'arg2'})
  })

  describe('output: array', () => {
    it('--bool', () => {
      const out = parse(['--bool'], {
        flags: {
          bool: flags.boolean(),
        },
      })
      expect(out.raw[0]).to.deep.include({flag: 'bool'})
    })

    it('arg1', () => {
      const out = parse(['arg1'], {
        args: [{name: 'foo'}],
      })
      expect(out.raw[0]).to.have.property('input', 'arg1')
    })

    it('parses args and flags', () => {
      const out = parse(['foo', '--myflag', 'bar', 'baz'], {
        args: [{name: 'myarg'}, {name: 'myarg2'}],
        flags: {myflag: flags.string()},
      })
      expect(out.argv[0]).to.equal('foo')
      expect(out.argv[1]).to.equal('baz')
      expect(out.flags.myflag).to.equal('bar')
    })

    describe('flags', () => {
      it('parses flags', () => {
        const out = parse(['--myflag', '--myflag2'], {
          flags: {myflag: flags.boolean(), myflag2: flags.boolean()},
        })
        expect(!!out.flags.myflag).to.equal(true)
        expect(!!out.flags.myflag2).to.equal(true)
      })

      it('parses short flags', () => {
        const out = parse(['-mf'], {
          flags: {
            force: flags.boolean({char: 'f'}),
            myflag: flags.boolean({char: 'm'}),
          },
        })
        expect(!!out.flags.myflag).to.equal(true)
        expect(!!out.flags.force).to.equal(true)
      })
    })
    it('parses flag value with "=" to separate', () => {
      const out = parse(['--myflag=foo'], {
        flags: {
          myflag: flags.string({char: 'm'}),
        },
      })
      expect(out.flags).to.deep.equal({myflag: 'foo'})
    })

    it('parses flag value with "=" in value', () => {
      const out = parse(['--myflag', '=foo'], {
        flags: {
          myflag: flags.string({char: 'm'}),
        },
      })
      expect(out.flags).to.deep.equal({myflag: '=foo'})
    })

    it('parses short flag value with "="', () => {
      const out = parse(['-m=foo'], {
        flags: {
          myflag: flags.string({char: 'm'}),
        },
      })
      expect(out.flags).to.deep.equal({myflag: 'foo'})
    })

    it('requires required flag', () => {
      expect(() => {
        parse([], {
          flags: {
            myflag: flags.string({
              description: 'flag description',
              required: true,
            }),
          },
        })
      }).to.throw('Missing required flag:\n --myflag MYFLAG  flag description\nSee more help with --help')
    })

    it('removes flags from argv', () => {
      const out = parse(['--myflag', 'bar', 'foo'], {
        args: [{name: 'myarg'}],
        flags: {myflag: flags.string()},
      })
      expect(out.flags).to.deep.equal({myflag: 'bar'})
      expect(out.argv).to.deep.equal(['foo'])
    })

    describe('args', () => {
      it('requires required args with names', () => {
        expect(() => {
          parse(['arg1'], {
            args: [
              {name: 'arg1', required: true},
              {
                description: 'arg2 desc',
                name: 'arg2',
                required: true,
              },
              {
                description: 'arg3 desc',
                name: 'arg3',
                required: true,
              },
            ],
          })
      }).to.throw(`Missing 2 required args:
arg2  arg2 desc
arg3  arg3 desc
See more help with --help`)
        })
      it('too many args', () => {
        expect(() => {
          parse(['arg1', 'arg2'], {
            args: [{name: 'arg1', required: true}],
          })
      }).to.throw('Unexpected argument: arg2\nSee more help with --help')
      })

      it('parses args', () => {
        const out = parse(['foo', 'bar'], {
          args: [{name: 'myarg'}, {name: 'myarg2'}],
        })
        expect(out.argv).to.deep.equal(['foo', 'bar'])
      })
      it('skips optional args', () => {
        const out = parse(['foo'], {
          args: [{name: 'myarg'}, {name: 'myarg2'}],
        })
        expect(out.argv).to.deep.equal(['foo'])
      })

      it('skips non-required args', () => {
        const out = parse(['foo'], {
          args: [{name: 'myarg', required: false}, {name: 'myarg2', required: false}],
        })
        expect(out.argv).to.deep.equal(['foo'])
      })

      it('parses something looking like a flag as an arg', () => {
        const out = parse(['--foo'], {
          args: [{name: 'myarg'}],
        })
        expect(out.argv).to.deep.equal(['--foo'])
      })
    })

    describe('multiple flags', () => {
      it('parses multiple flags', () => {
        const out = parse(['--bar', 'a', '--bar=b', '--foo=c', '--baz=d'], {
          flags: {
            foo: flags.string(),
            bar: flags.string({multiple: true}),
            baz: flags.string({required: true}),
          },
        })
        expect(out.flags.foo!.toUpperCase()).to.equal('C')
        expect(out.flags.baz.toUpperCase()).to.equal('D')
        expect(out.flags.bar.join('|')).to.equal('a|b')
      })
    })

    describe('strict: false', () => {
      it('skips flag parsing after "--"', () => {
        const out = parse(['foo', 'bar', '--', '--myflag'], {
          args: [{name: 'argOne'}],
          flags: {myflag: flags.boolean()},
          strict: false,
        })
        expect(out.argv).to.deep.equal(['foo', 'bar', '--myflag'])
        expect(out.args).to.deep.equal({argOne: 'foo'})
      })

      describe('--: false', () => {
        it('can be disabled', () => {
          const out = parse(['foo', 'bar', '--', '--myflag'], {
            args: [{name: 'argOne'}],
            strict: false,
            '--': false,
          })
          expect(out.argv).to.deep.equal(['foo', 'bar', '--', '--myflag'])
          expect(out.args).to.deep.equal({argOne: 'foo'})
        })
      })

      it('does not repeat arguments', () => {
        const out = parse(['foo', '--myflag=foo bar'], {
          strict: false,
        })
        expect(out.argv).to.deep.equal(['foo', '--myflag=foo bar'])
      })
    })

    describe('integer flag', () => {
      it('parses integers', () => {
        const out = parse(['--int', '100'], {
          flags: {int: flags.integer(), s: flags.string()},
        })
        expect(out.flags).to.deep.include({int: 100})
      })

      it('does not parse strings', () => {
        expect(() => {
          parse(['--int', 's10'], {
            flags: {int: flags.integer()},
          })
        }).to.throw('Expected an integer but received: s10')
      })
    })
  })

  it('--no-color', () => {
    const out = parse(['--no-color'], {})
    expect(out.flags).to.deep.include({color: false})
  })

  describe('parse', () => {
    it('parse', () => {
      const out = parse(['--foo=bar', '100'], {
        args: [{name: 'num', parse: i => parseInt(i, 10)}],
        flags: {foo: flags.string({parse: input => input.toUpperCase()})},
      })
      expect(out.flags).to.deep.include({foo: 'BAR'})
      expect(out.args).to.deep.include({num: 100})
      expect(out.argv).to.deep.equal([100])
    })

    // it('gets arg/flag in context', () => {
    //   const out = parse({
    //     args: [{ name: 'num', parse: (_, ctx) => ctx.arg.name!.toUpperCase() }],
    //     argv: ['--foo=bar', '100'],
    //     flags: { foo: flags.string({ parse: (_, ctx) => ctx.flag.name.toUpperCase() }) },
    //   })
    //   expect(out.flags).to.deep.include({ foo: 'FOO' })
    //   expect(out.args).to.deep.include({ num: 'NUM' })
    // })
  })

  describe('defaults', () => {
    it('defaults', () => {
      const out = parse([], {
        args: [{name: 'baz', default: 'BAZ'}],
        flags: {foo: flags.string({default: 'bar'})},
      })
      expect(out.args).to.deep.include({baz: 'BAZ'})
      expect(out.argv).to.deep.equal(['BAZ'])
      expect(out.flags).to.deep.include({foo: 'bar'})
    })

    it('default as function', () => {
      const out = parse([], {
        args: [{name: 'baz', default: () => 'BAZ'}],
        flags: {foo: flags.string({default: () => 'bar'})},
      })
      expect(out.args).to.deep.include({baz: 'BAZ'})
      expect(out.argv).to.deep.equal(['BAZ'])
      expect(out.flags).to.deep.include({foo: 'bar'})
    })

    it('default has options', () => {
      const out = parse([], {
        // args: [{ name: 'baz', default: () => 'BAZ' }],
        flags: {foo: flags.string({description: 'bar', default: ({options}) => options.description})},
      })
      // expect(out.args).to.deep.include({ baz: 'BAZ' })
      // expect(out.argv).to.deep.include(['BAZ'])
      expect(out.flags).to.deep.include({foo: 'bar'})
    })

    it('can default to a different flag', () => {
      const out = parse(['--foo=bar'], {
        flags: {
          bar: flags.string({
            default: opts => {
              return opts.flags.foo
            },
          }),
          foo: flags.string(),
        },
      })
      expect(out.flags).to.deep.include({foo: 'bar', bar: 'bar'})
    })
  })

  describe('custom option', () => {
    it('can pass parse fn', () => {
      const foo = flags.option({char: 'f', parse: () => 100})
      const out = parse(['-f', 'bar'], {
        flags: {foo},
      })
      expect(out.flags).to.deep.include({foo: 100})
    })
  })

  describe('build', () => {
    it('can pass parse fn', () => {
      const foo = flags.build({char: 'f', parse: () => 100})
      const out = parse(['-f', 'bar'], {
        flags: {foo: foo()},
      })
      expect(out.flags).to.deep.include({foo: 100})
    })
    it('does not require parse fn', () => {
      const foo = flags.build({char: 'f'})
      const out = parse(['-f', 'bar'], {
        flags: {foo: foo()},
      })
      expect(out.flags).to.deep.include({foo: 'bar'})
    })
  })

  describe('flag options', () => {
    it('accepts valid option', () => {
      const out = parse(['--foo', 'myotheropt'], {
        flags: {foo: flags.string({options: ['myopt', 'myotheropt']})},
      })
      expect(out.flags.foo).to.equal('myotheropt')
    })

    it('fails when invalid', () => {
      expect(() => {
        parse(['--foo', 'invalidopt'], {
          flags: {foo: flags.string({options: ['myopt', 'myotheropt']})},
        })
      }).to.throw('Expected --foo=invalidopt to be one of: myopt, myotheropt')
    })
  })

  describe('arg options', () => {
    it('accepts valid option', () => {
      const out = parse(['myotheropt'], {
        args: [{name: 'foo', options: ['myopt', 'myotheropt']}],
      })
      expect(out.args.foo).to.equal('myotheropt')
    })

    it('fails when invalid', () => {
      expect(() => {
        parse(['invalidopt'], {
          args: [{name: 'foo', options: ['myopt', 'myotheropt']}],
        })
      }).to.throw('Expected invalidopt to be one of: myopt, myotheropt')
    })
  })

  describe('env', () => {
    it('accepts as environment variable', () => {
      process.env.TEST_FOO = '101'
      const out = parse([], {
        flags: {foo: flags.string({env: 'TEST_FOO'})},
      })
      expect(out.flags.foo).to.equal('101')
      delete process.env.TEST_FOO
    })
  })

  describe('flag context', () => {
    it('accepts context in parse', () => {
      const out = parse(['--foo'], {
        context: {a: 101},
        flags: {foo: flags.boolean({
          parse: (_: any, ctx: any) => ctx.a
        })},
      })
      expect(out.flags.foo).to.equal(101)
    })
  })

  it('parses multiple flags', () => {
    const out = parse(['--foo=a', '--foo', 'b'], {
      flags: {foo: flags.string()},
    })
    expect(out.flags.foo).to.equal('b')
  })
})
